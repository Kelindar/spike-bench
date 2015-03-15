package main

import(
	"fmt"
	"spike"
)

var success int
var fail int

func main() {
	channel := new(spike.TcpChannel)
	channel.Connect("127.0.0.1:8002", 1000000)

	go onEvent(channel)
	go onGet(channel)
	go onCheck(channel)
	go onGetAll(channel)

	// Fetch everything
	go channel.GetAll()
	
	// So we don't exit the app
	var input string
	fmt.Scanln(&input)
}

func onGetAll(channel *spike.TcpChannel){
	for{
    	msg := <- channel.OnGetAll
    	fmt.Println("Test: Data Coherence Test...")
    	for _, entity := range msg.Table{
    		go channel.Check(entity.Key, entity.Value)
    	}
	}
}

func onEvent(channel *spike.TcpChannel){
	for{
    	msg := <- channel.OnEvent
    	fmt.Println("Event:", msg.Message)		
	}
}

func onGet(channel *spike.TcpChannel){
	for{
    	msg := <- channel.OnGet
    	fmt.Println("Get:", msg.Value)		
	}
}

func onCheck(channel *spike.TcpChannel){
	for{
		msg := <- channel.OnCheck
		if (!msg.Success){
			fail++
		}else{
			success++
		}
		if(fail + success >= 1200){
			fmt.Println("Success:", success, "Fail:", fail)
		}
	}
}
